# -*- coding: utf-8 -*-
import io
import json
import random
import string
from datetime import datetime
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import desc, func
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from modules.hr.models.assessment_models import (
    HRAssessment,
    HRAssessmentQuestion,
    HRAssessmentSubmission,
    HRAssessmentAnswer
)
from modules.hr.services.md_parser_service import parse_markdown_assessment, generate_assessment_markdown_template
from modules.hr.services.excel_assessment_parser_service import parse_excel_assessment, generate_assessment_excel_template
from modules.hr.services.ai_assessment_service import evaluate_assessment_submission, evaluate_essay_answer

def generate_assessment_code(prefix="quiz") -> str:
    """Tạo mã định danh bài kiểm tra ngẫu nhiên duy nhất nếu chưa có"""
    suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=5))
    return f"{prefix}_{suffix}"

def list_assessments(db: Session, search: Optional[str] = None, category: Optional[str] = None):
    """Lấy danh sách các bài kiểm tra kèm thống kê số câu và lượt làm bài"""
    query = db.query(HRAssessment)
    
    if search:
        query = query.filter(HRAssessment.title.ilike(f"%{search}%") | HRAssessment.assessment_code.ilike(f"%{search}%"))
    if category and category != "all":
        query = query.filter(HRAssessment.category == category)
        
    assessments = query.order_by(desc(HRAssessment.created_at)).all()
    
    result = []
    for a in assessments:
        sub_count = db.query(func.count(HRAssessmentSubmission.id)).filter(HRAssessmentSubmission.assessment_id == a.id).scalar() or 0
        q_count = len(a.questions) if a.questions else a.total_questions
        
        target_pos = []
        try:
            if a.target_positions_json:
                target_pos = json.loads(a.target_positions_json)
        except Exception:
            target_pos = []
            
        result.append({
            "id": a.id,
            "assessment_code": a.assessment_code,
            "title": a.title,
            "description": a.description,
            "category": a.category or "Chung",
            "target_positions": target_pos,
            "duration_minutes": a.duration_minutes,
            "total_questions": q_count,
            "pass_percentage": a.pass_percentage,
            "shuffle_questions": bool(a.shuffle_questions),
            "shuffle_options": bool(a.shuffle_options),
            "status": a.status or "active",
            "submission_count": sub_count,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else ""
        })
    return result

def get_assessment_detail(db: Session, assessment_id: int):
    """Lấy chi tiết toàn bộ bài kiểm tra bao gồm cả ngân hàng câu hỏi (Dành cho Quản trị viên)"""
    a = db.query(HRAssessment).filter(HRAssessment.id == assessment_id).first()
    if not a:
        return None
        
    questions = []
    for q in a.questions:
        options = []
        try:
            if q.options_json:
                options = json.loads(q.options_json)
        except Exception:
            options = []
            
        correct_answers = []
        try:
            if q.correct_answers_json:
                correct_answers = json.loads(q.correct_answers_json)
        except Exception:
            correct_answers = []
            
        questions.append({
            "id": q.id,
            "order_index": q.order_index,
            "question_type": q.question_type,
            "question_text": q.question_text,
            "category_tag": q.category_tag,
            "options": options,
            "correct_answers": correct_answers,
            "points": q.points,
            "explanation": q.explanation
        })
        
    target_pos = []
    try:
        if a.target_positions_json:
            target_pos = json.loads(a.target_positions_json)
    except Exception:
        target_pos = []
        
    sub_count = db.query(func.count(HRAssessmentSubmission.id)).filter(HRAssessmentSubmission.assessment_id == a.id).scalar() or 0
    
    return {
        "id": a.id,
        "assessment_code": a.assessment_code,
        "title": a.title,
        "description": a.description,
        "category": a.category,
        "target_positions": target_pos,
        "duration_minutes": a.duration_minutes,
        "total_questions": len(questions),
        "pass_percentage": a.pass_percentage,
        "shuffle_questions": bool(a.shuffle_questions),
        "shuffle_options": bool(a.shuffle_options),
        "status": a.status,
        "instructions": a.instructions,
        "submission_count": sub_count,
        "created_at": a.created_at.strftime("%Y-%m-%d %H:%M") if a.created_at else "",
        "questions": questions
    }

def create_assessment(db: Session, payload: Dict[str, Any]):
    """Tạo mới bài kiểm tra và lưu ngân hàng câu hỏi"""
    code = payload.get("assessment_code")
    if not code:
        code = generate_assessment_code()
    else:
        exist = db.query(HRAssessment).filter(HRAssessment.assessment_code == code).first()
        if exist:
            code = generate_assessment_code(code)
            
    target_positions = payload.get("target_positions") or []
    target_pos_str = json.dumps(target_positions, ensure_ascii=False) if isinstance(target_positions, list) else target_positions
    
    questions_data = payload.get("questions") or []
    
    assessment = HRAssessment(
        assessment_code=code,
        title=payload.get("title", "Bài kiểm tra năng lực"),
        description=payload.get("description", ""),
        category=payload.get("category", "Quản lý chất lượng"),
        target_positions_json=target_pos_str,
        duration_minutes=payload.get("duration_minutes", 45),
        total_questions=len(questions_data),
        pass_percentage=payload.get("pass_percentage", 60.0),
        shuffle_questions=payload.get("shuffle_questions", True),
        shuffle_options=payload.get("shuffle_options", True),
        status=payload.get("status", "active"),
        instructions=payload.get("instructions", "")
    )
    
    db.add(assessment)
    db.flush()
    
    for idx, q in enumerate(questions_data, 1):
        opts = q.get("options") or []
        opts_str = json.dumps(opts, ensure_ascii=False) if isinstance(opts, (list, dict)) else str(opts)
        
        corrects = q.get("correct_answers") or []
        corrects_str = json.dumps(corrects, ensure_ascii=False) if isinstance(corrects, (list, dict)) else str(corrects)
        
        q_obj = HRAssessmentQuestion(
            assessment_id=assessment.id,
            question_type=q.get("question_type", "single_choice"),
            question_text=q.get("question_text", ""),
            category_tag=q.get("category_tag", assessment.category),
            options_json=opts_str,
            correct_answers_json=corrects_str,
            points=float(q.get("points", 1.0)),
            explanation=q.get("explanation", ""),
            order_index=q.get("order_index", idx)
        )
        db.add(q_obj)
        
    db.commit()
    db.refresh(assessment)
    return get_assessment_detail(db, assessment.id)

def update_assessment(db: Session, assessment_id: int, payload: Dict[str, Any]):
    """Cập nhật bài kiểm tra và thay thế/cập nhật danh sách câu hỏi"""
    a = db.query(HRAssessment).filter(HRAssessment.id == assessment_id).first()
    if not a:
        return None
        
    if "title" in payload:
        a.title = payload["title"]
    if "description" in payload:
        a.description = payload["description"]
    if "category" in payload:
        a.category = payload["category"]
    if "target_positions" in payload:
        tpos = payload["target_positions"]
        a.target_positions_json = json.dumps(tpos, ensure_ascii=False) if isinstance(tpos, list) else tpos
    if "duration_minutes" in payload:
        a.duration_minutes = payload["duration_minutes"]
    if "pass_percentage" in payload:
        a.pass_percentage = payload["pass_percentage"]
    if "shuffle_questions" in payload:
        a.shuffle_questions = payload["shuffle_questions"]
    if "shuffle_options" in payload:
        a.shuffle_options = payload["shuffle_options"]
    if "status" in payload:
        a.status = payload["status"]
    if "instructions" in payload:
        a.instructions = payload["instructions"]
        
    if "questions" in payload:
        db.query(HRAssessmentQuestion).filter(HRAssessmentQuestion.assessment_id == a.id).delete()
        questions_data = payload["questions"]
        a.total_questions = len(questions_data)
        
        for idx, q in enumerate(questions_data, 1):
            opts = q.get("options") or []
            opts_str = json.dumps(opts, ensure_ascii=False) if isinstance(opts, (list, dict)) else str(opts)
            
            corrects = q.get("correct_answers") or []
            corrects_str = json.dumps(corrects, ensure_ascii=False) if isinstance(corrects, (list, dict)) else str(corrects)
            
            q_obj = HRAssessmentQuestion(
                assessment_id=a.id,
                question_type=q.get("question_type", "single_choice"),
                question_text=q.get("question_text", ""),
                category_tag=q.get("category_tag", a.category),
                options_json=opts_str,
                correct_answers_json=corrects_str,
                points=float(q.get("points", 1.0)),
                explanation=q.get("explanation", ""),
                order_index=q.get("order_index", idx)
            )
            db.add(q_obj)
            
    db.commit()
    db.refresh(a)
    return get_assessment_detail(db, a.id)

def append_questions_to_assessment(db: Session, assessment_id: int, questions_data: List[Dict[str, Any]]):
    """Bổ sung thêm danh sách câu hỏi vào bài kiểm tra hiện tại"""
    a = db.query(HRAssessment).filter(HRAssessment.id == assessment_id).first()
    if not a:
        return None
        
    current_count = db.query(func.count(HRAssessmentQuestion.id)).filter(HRAssessmentQuestion.assessment_id == a.id).scalar() or 0
    
    for idx, q in enumerate(questions_data, start=current_count + 1):
        opts = q.get("options") or []
        opts_str = json.dumps(opts, ensure_ascii=False) if isinstance(opts, (list, dict)) else str(opts)
        
        corrects = q.get("correct_answers") or []
        corrects_str = json.dumps(corrects, ensure_ascii=False) if isinstance(corrects, (list, dict)) else str(corrects)
        
        q_obj = HRAssessmentQuestion(
            assessment_id=a.id,
            question_type=q.get("question_type", "single_choice"),
            question_text=q.get("question_text", ""),
            category_tag=q.get("category_tag", a.category),
            options_json=opts_str,
            correct_answers_json=corrects_str,
            points=float(q.get("points", 1.0)),
            explanation=q.get("explanation", ""),
            order_index=idx
        )
        db.add(q_obj)
        
    a.total_questions = current_count + len(questions_data)
    db.commit()
    db.refresh(a)
    return get_assessment_detail(db, a.id)

def delete_assessment(db: Session, assessment_id: int):
    """Xóa bài kiểm tra và các câu hỏi, bài nộp liên quan"""
    a = db.query(HRAssessment).filter(HRAssessment.id == assessment_id).first()
    if not a:
        return False
    db.delete(a)
    db.commit()
    return True

def toggle_assessment_status(db: Session, assessment_id: int):
    """Bật/tắt trạng thái Hoạt động / Tạm dừng của bài kiểm tra"""
    a = db.query(HRAssessment).filter(HRAssessment.id == assessment_id).first()
    if not a:
        return None
    a.status = "paused" if a.status == "active" else "active"
    db.commit()
    db.refresh(a)
    return {"id": a.id, "status": a.status}

def preview_assessment_import(file_bytes: Optional[bytes] = None, filename: str = "", content_str: Optional[str] = None) -> Dict[str, Any]:
    """Phân tích dữ liệu từ Excel (.xlsx) hoặc Markdown (.md) để trả về Preview trước khi lưu"""
    is_excel = filename.lower().endswith(('.xlsx', '.xls')) if filename else False
    
    if is_excel and file_bytes:
        return parse_excel_assessment(file_bytes)
    else:
        text = ""
        if file_bytes:
            try:
                text = file_bytes.decode("utf-8")
            except UnicodeDecodeError:
                text = file_bytes.decode("utf-8-sig", errors="ignore")
        elif content_str:
            text = content_str
            
        if not text.strip():
            return {
                "metadata": {},
                "questions": [],
                "total_questions": 0,
                "warnings": ["Nội dung đề thi trống."]
            }
        return parse_markdown_assessment(text)

def import_assessment_from_text(db: Session, markdown_content: str):
    """Bóc tách nội dung Markdown và tự động tạo đề thi vào cơ sở dữ liệu"""
    parsed = parse_markdown_assessment(markdown_content)
    meta = parsed["metadata"]
    questions = parsed["questions"]
    
    payload = {
        "assessment_code": generate_assessment_code("quiz"),
        "title": meta.get("title", "Bài kiểm tra chuyên môn"),
        "description": meta.get("description", ""),
        "category": meta.get("category", "Quản lý chất lượng"),
        "target_positions": meta.get("target_positions", ["QA", "QC", "Tổ trưởng"]),
        "duration_minutes": meta.get("duration_minutes", 45),
        "pass_percentage": meta.get("pass_percentage", 60.0),
        "shuffle_questions": meta.get("shuffle_questions", True),
        "shuffle_options": meta.get("shuffle_options", True),
        "status": "active",
        "instructions": meta.get("instructions", ""),
        "questions": questions
    }
    return create_assessment(db, payload)

def import_assessment_from_parsed_payload(db: Session, payload: Dict[str, Any]):
    """Tạo đề thi từ payload đã được preview & xác nhận từ frontend"""
    meta = payload.get("metadata") or {}
    questions = payload.get("questions") or []
    
    full_payload = {
        "assessment_code": generate_assessment_code("quiz"),
        "title": meta.get("title", "Bài kiểm tra năng lực"),
        "description": meta.get("description", ""),
        "category": meta.get("category", "Quản lý chất lượng"),
        "target_positions": meta.get("target_positions", ["QA", "QC", "Tổ trưởng"]),
        "duration_minutes": meta.get("duration_minutes", 45),
        "pass_percentage": meta.get("pass_percentage", 60.0),
        "shuffle_questions": meta.get("shuffle_questions", True),
        "shuffle_options": meta.get("shuffle_options", True),
        "status": "active",
        "instructions": meta.get("instructions", ""),
        "questions": questions
    }
    return create_assessment(db, full_payload)

def get_public_assessment_for_candidate(db: Session, code_or_id: str):
    """Lấy thông tin đề thi cho thí sinh làm bài thi trực tuyến"""
    if code_or_id.isdigit():
        a = db.query(HRAssessment).filter(HRAssessment.id == int(code_or_id)).first()
    else:
        a = db.query(HRAssessment).filter(HRAssessment.assessment_code == code_or_id).first()
        
    if not a:
        return None
        
    if a.status != "active":
        return {"error": "inactive", "message": "Bài kiểm tra này hiện đang tạm dừng hoặc chưa được mở."}
        
    target_pos = []
    try:
        if a.target_positions_json:
            target_pos = json.loads(a.target_positions_json)
    except Exception:
        target_pos = []
        
    raw_questions = list(a.questions)
    
    if a.shuffle_questions:
        random.shuffle(raw_questions)
        
    sanitized_questions = []
    for idx, q in enumerate(raw_questions, 1):
        options = []
        try:
            if q.options_json:
                options = list(json.loads(q.options_json))
        except Exception:
            options = []
            
        if a.shuffle_options and len(options) > 1:
            random.shuffle(options)
            
        sanitized_questions.append({
            "id": q.id,
            "order_number": idx,
            "question_type": q.question_type or "single_choice",
            "question_text": q.question_text,
            "category_tag": q.category_tag,
            "points": q.points,
            "options": options
        })
        
    return {
        "id": a.id,
        "assessment_code": a.assessment_code,
        "title": a.title,
        "description": a.description,
        "category": a.category,
        "target_positions": target_pos,
        "duration_minutes": a.duration_minutes,
        "total_questions": len(sanitized_questions),
        "instructions": a.instructions,
        "questions": sanitized_questions
    }

def submit_assessment_answers(db: Session, payload: Dict[str, Any]):
    """Xử lý nộp bài thi của nhân sự (kèm AI Semantic Essay Grader)"""
    assessment_id = payload.get("assessment_id")
    a = db.query(HRAssessment).filter(HRAssessment.id == assessment_id).first()
    if not a:
        return None
        
    candidate_name = payload.get("candidate_name", "Nhân sự").strip()
    position_name = payload.get("position_name", "Chưa xác định").strip()
    department_name = payload.get("department_name", "Chưa xác định").strip()
    employee_code = payload.get("employee_code", "").strip()
    time_spent_seconds = int(payload.get("time_spent_seconds", 0))
    is_timed_out = payload.get("is_timed_out", False)
    
    candidate_answers = payload.get("answers", {})
    
    total_score = 0.0
    max_score = 0.0
    evaluated_questions = []
    db_answers_to_save = []
    
    for q in a.questions:
        q_id_str = str(q.id)
        max_score += q.points
        q_type = getattr(q, 'question_type', 'single_choice')
        
        if q_type == 'essay':
            cand_choice = candidate_answers.get(q_id_str) or candidate_answers.get(q.id) or ""
            cand_text = str(cand_choice).strip() if cand_choice else ""
            
            # GỌI AI SEMANTIC ESSAY GRADER
            essay_eval = evaluate_essay_answer(
                question_text=q.question_text,
                criteria_rubric=q.explanation or "",
                candidate_answer=cand_text,
                max_points=q.points,
                position_name=position_name,
                department_name=department_name,
                category_tag=q.category_tag or a.category or ""
            )
            
            points_earned = float(essay_eval.get("points_earned", 0.0))
            is_correct = bool(essay_eval.get("is_correct", False))
            total_score += points_earned
            
            ai_feedback_json = json.dumps({
                "feedback": essay_eval.get("feedback", ""),
                "matched_points": essay_eval.get("matched_points", []),
                "missing_points": essay_eval.get("missing_points", [])
            }, ensure_ascii=False)
            
            evaluated_questions.append({
                "question_id": q.id,
                "question_type": "essay",
                "question_text": q.question_text,
                "category_tag": q.category_tag,
                "selected": [cand_text],
                "correct": [q.explanation or "Theo tiêu chí chấm điểm tự luận & AI đối chiếu"],
                "is_correct": is_correct,
                "points": q.points,
                "points_earned": points_earned,
                "explanation": q.explanation,
                "ai_feedback": ai_feedback_json
            })
            
            db_answers_to_save.append({
                "question_id": q.id,
                "selected_answers_json": json.dumps([cand_text], ensure_ascii=False),
                "is_correct": is_correct,
                "points_earned": points_earned,
                "ai_feedback": ai_feedback_json
            })
        else:
            correct_list = []
            try:
                if q.correct_answers_json:
                    raw_c = json.loads(q.correct_answers_json)
                    correct_list = [str(x).strip().upper() for x in raw_c] if isinstance(raw_c, list) else [str(raw_c).strip().upper()]
            except Exception:
                correct_list = []
                
            cand_choice = candidate_answers.get(q_id_str) or candidate_answers.get(q.id) or []
            if isinstance(cand_choice, str):
                cand_choice_list = [cand_choice.strip().upper()]
            elif isinstance(cand_choice, list):
                cand_choice_list = [str(x).strip().upper() for x in cand_choice]
            else:
                cand_choice_list = []
                
            is_correct = False
            points_earned = 0.0
            
            if sorted(cand_choice_list) == sorted(correct_list) and len(correct_list) > 0:
                is_correct = True
                points_earned = q.points
                total_score += points_earned
                
            evaluated_questions.append({
                "question_id": q.id,
                "question_type": q_type,
                "question_text": q.question_text,
                "category_tag": q.category_tag,
                "selected": cand_choice_list,
                "correct": correct_list,
                "is_correct": is_correct,
                "points": q.points,
                "points_earned": points_earned,
                "explanation": q.explanation,
                "ai_feedback": None
            })
            
            db_answers_to_save.append({
                "question_id": q.id,
                "selected_answers_json": json.dumps(cand_choice_list, ensure_ascii=False),
                "is_correct": is_correct,
                "points_earned": points_earned,
                "ai_feedback": None
            })
        
    percentage = (total_score / max_score * 100.0) if max_score > 0 else 0.0
    
    eval_result = evaluate_assessment_submission(
        candidate_name=candidate_name,
        position_name=position_name,
        department_name=department_name,
        assessment_title=a.title,
        percentage=percentage,
        total_score=total_score,
        max_score=max_score,
        question_results=evaluated_questions
    )
    
    submission = HRAssessmentSubmission(
        assessment_id=a.id,
        candidate_name=candidate_name,
        position_name=position_name,
        department_name=department_name,
        employee_code=employee_code,
        started_at=datetime.utcnow(),
        submitted_at=datetime.utcnow(),
        time_spent_seconds=time_spent_seconds,
        total_score=round(total_score, 2),
        max_score=max_score,
        percentage=round(percentage, 1),
        rank_level=eval_result["rank_level"],
        rank_title=eval_result["rank_title"],
        nine_box_category=eval_result["nine_box_category"],
        position_fit_status=eval_result["position_fit_status"],
        criteria_evaluation_json=json.dumps(eval_result["criteria_evaluation"], ensure_ascii=False),
        ai_summary=eval_result["ai_summary"],
        ai_recommendations_json=json.dumps(eval_result["ai_recommendations"], ensure_ascii=False),
        status="timed_out" if is_timed_out else "completed"
    )
    
    db.add(submission)
    db.flush()
    
    for ans_data in db_answers_to_save:
        ans_obj = HRAssessmentAnswer(
            submission_id=submission.id,
            question_id=ans_data["question_id"],
            selected_answers_json=ans_data["selected_answers_json"],
            is_correct=ans_data["is_correct"],
            points_earned=ans_data["points_earned"],
            ai_feedback=ans_data.get("ai_feedback")
        )
        db.add(ans_obj)
        
    db.commit()
    db.refresh(submission)
    
    return get_submission_result(db, submission.id)

def get_submission_result(db: Session, submission_id: int):
    """Lấy dữ liệu chi tiết bài làm của nhân sự bao gồm cả chi tiết câu hỏi & câu trả lời"""
    sub = db.query(HRAssessmentSubmission).filter(HRAssessmentSubmission.id == submission_id).first()
    if not sub:
        return None
        
    criteria = []
    try:
        if sub.criteria_evaluation_json:
            criteria = json.loads(sub.criteria_evaluation_json)
    except Exception:
        criteria = []
        
    recommendations = []
    try:
        if sub.ai_recommendations_json:
            recommendations = json.loads(sub.ai_recommendations_json)
    except Exception:
        recommendations = []
        
    detailed_answers = []
    if sub.answers:
        for ans in sub.answers:
            q = ans.question
            options = []
            correct_answers = []
            if q:
                try:
                    if q.options_json: options = json.loads(q.options_json)
                except Exception: options = []
                try:
                    if q.correct_answers_json: correct_answers = json.loads(q.correct_answers_json)
                except Exception: correct_answers = []
                
            selected_answers = []
            try:
                if ans.selected_answers_json: selected_answers = json.loads(ans.selected_answers_json)
            except Exception: selected_answers = []
            
            # Phân tích ai_feedback nếu là JSON
            parsed_ai_feedback = None
            if ans.ai_feedback:
                try:
                    parsed_ai_feedback = json.loads(ans.ai_feedback)
                except Exception:
                    parsed_ai_feedback = {"feedback": ans.ai_feedback, "matched_points": [], "missing_points": []}
            
            detailed_answers.append({
                "answer_id": ans.id,
                "question_id": ans.question_id,
                "question_text": q.question_text if q else "",
                "question_type": q.question_type if q else "single_choice",
                "category_tag": q.category_tag if q else "",
                "options": options,
                "selected_answers": selected_answers,
                "correct_answers": correct_answers,
                "is_correct": ans.is_correct,
                "points_earned": ans.points_earned,
                "points_max": q.points if q else 1.0,
                "explanation": q.explanation if q else "",
                "ai_feedback": parsed_ai_feedback
            })
        
    return {
        "id": sub.id,
        "assessment_id": sub.assessment_id,
        "assessment_title": sub.assessment.title if sub.assessment else "",
        "assessment_code": sub.assessment.assessment_code if sub.assessment else "",
        "candidate_name": sub.candidate_name,
        "position_name": sub.position_name,
        "department_name": sub.department_name,
        "employee_code": sub.employee_code,
        "total_score": sub.total_score,
        "max_score": sub.max_score,
        "percentage": sub.percentage,
        "rank_level": sub.rank_level,
        "rank_title": sub.rank_title,
        "nine_box_category": sub.nine_box_category,
        "position_fit_status": sub.position_fit_status,
        "criteria_evaluation": criteria,
        "ai_summary": sub.ai_summary,
        "ai_recommendations": recommendations,
        "time_spent_seconds": sub.time_spent_seconds,
        "submitted_at": sub.submitted_at.strftime("%Y-%m-%d %H:%M") if sub.submitted_at else "",
        "answers": detailed_answers
    }

def regrade_submission_with_ai(db: Session, submission_id: int):
    """Chấm lại toàn bộ các câu hỏi tự luận bằng AI và tính toán lại điểm tổng hợp"""
    sub = db.query(HRAssessmentSubmission).filter(HRAssessmentSubmission.id == submission_id).first()
    if not sub:
        return None
        
    total_score = 0.0
    max_score = 0.0
    evaluated_questions = []
    
    for ans in sub.answers:
        q = ans.question
        if not q:
            continue
        max_score += q.points
        q_type = q.question_type
        
        if q_type == 'essay':
            cand_list = []
            try:
                if ans.selected_answers_json: cand_list = json.loads(ans.selected_answers_json)
            except Exception: cand_list = []
            cand_text = cand_list[0] if cand_list else ""
            
            # GỌI AI SEMANTIC ESSAY GRADER
            essay_eval = evaluate_essay_answer(
                question_text=q.question_text,
                criteria_rubric=q.explanation or "",
                candidate_answer=cand_text,
                max_points=q.points,
                position_name=sub.position_name,
                department_name=sub.department_name,
                category_tag=q.category_tag or ""
            )
            
            pts = float(essay_eval.get("points_earned", 0.0))
            is_cor = bool(essay_eval.get("is_correct", False))
            
            ans.points_earned = pts
            ans.is_correct = is_cor
            ans.ai_feedback = json.dumps({
                "feedback": essay_eval.get("feedback", ""),
                "matched_points": essay_eval.get("matched_points", []),
                "missing_points": essay_eval.get("missing_points", [])
            }, ensure_ascii=False)
            
            total_score += pts
            
            evaluated_questions.append({
                "question_id": q.id,
                "question_type": "essay",
                "question_text": q.question_text,
                "category_tag": q.category_tag,
                "selected": [cand_text],
                "correct": [q.explanation or ""],
                "is_correct": is_cor,
                "points": q.points,
                "points_earned": pts,
                "explanation": q.explanation
            })
        else:
            total_score += ans.points_earned
            evaluated_questions.append({
                "question_id": q.id,
                "question_type": q_type,
                "question_text": q.question_text,
                "category_tag": q.category_tag,
                "selected": [],
                "correct": [],
                "is_correct": ans.is_correct,
                "points": q.points,
                "points_earned": ans.points_earned,
                "explanation": q.explanation
            })
            
    percentage = (total_score / max_score * 100.0) if max_score > 0 else 0.0
    
    # Tính lại xếp loại Level & AI Summary
    eval_result = evaluate_assessment_submission(
        candidate_name=sub.candidate_name,
        position_name=sub.position_name,
        department_name=sub.department_name,
        assessment_title=sub.assessment.title if sub.assessment else "",
        percentage=percentage,
        total_score=total_score,
        max_score=max_score,
        question_results=evaluated_questions
    )
    
    sub.total_score = round(total_score, 2)
    sub.percentage = round(percentage, 1)
    sub.rank_level = eval_result["rank_level"]
    sub.rank_title = eval_result["rank_title"]
    sub.nine_box_category = eval_result["nine_box_category"]
    sub.position_fit_status = eval_result["position_fit_status"]
    sub.criteria_evaluation_json = json.dumps(eval_result["criteria_evaluation"], ensure_ascii=False)
    sub.ai_summary = eval_result["ai_summary"]
    sub.ai_recommendations_json = json.dumps(eval_result["ai_recommendations"], ensure_ascii=False)
    
    db.commit()
    db.refresh(sub)
    return get_submission_result(db, sub.id)

def override_submission_score(db: Session, submission_id: int, payload: Dict[str, Any]):
    """Giám khảo / HR điều chỉnh điểm số thủ công cho bài làm"""
    sub = db.query(HRAssessmentSubmission).filter(HRAssessmentSubmission.id == submission_id).first()
    if not sub:
        return None
        
    override_answers = payload.get("answers") or [] # [{ answer_id: 1, points_earned: 2.0, feedback: "..." }]
    ans_map = {ans.id: ans for ans in sub.answers}
    
    for item in override_answers:
        ans_id = item.get("answer_id")
        if ans_id in ans_map:
            ans_obj = ans_map[ans_id]
            q = ans_obj.question
            max_p = q.points if q else 1.0
            new_p = float(item.get("points_earned", ans_obj.points_earned))
            new_p = max(0.0, min(max_p, new_p))
            
            ans_obj.points_earned = new_p
            ans_obj.is_correct = (new_p >= (max_p * 0.5))
            
            custom_fb = item.get("feedback")
            if custom_fb:
                ans_obj.ai_feedback = json.dumps({
                    "feedback": f"[Giám khảo điều chỉnh]: {custom_fb}",
                    "matched_points": ["Được duyệt bởi Giám khảo HR"],
                    "missing_points": []
                }, ensure_ascii=False)
                
    # Tính lại tổng điểm
    total_score = sum(ans.points_earned for ans in sub.answers)
    max_score = sub.max_score or 1.0
    percentage = (total_score / max_score * 100.0)
    
    # Tính lại Level A - F
    if percentage >= 90.0:
        sub.rank_level = "Level A"
        sub.rank_title = "Level A - Xuất sắc / Năng lực vượt trội"
        sub.nine_box_category = "High Skill - High Will (Star Performer / High Potential)"
        sub.position_fit_status = "Đáp ứng xuất sắc, sẵn sàng quy hoạch cán bộ nguồn"
    elif percentage >= 75.0:
        sub.rank_level = "Level B"
        sub.rank_title = "Level B - Khá / Nắm vững chuyên môn"
        sub.nine_box_category = "High Skill - Medium Will (Core Performer / Solid Contributor)"
        sub.position_fit_status = "Đáp ứng tốt vị trí hiện tại, xem xét nâng bậc lương"
    elif percentage >= 60.0:
        sub.rank_level = "Level C"
        sub.rank_title = "Level C - Đạt chuẩn / Đạt yêu cầu tối thiểu"
        sub.nine_box_category = "Medium Skill - Medium Will (Effective Contributor)"
        sub.position_fit_status = "Đạt yêu cầu tối thiểu, cần kèm cặp chuyên sâu"
    elif percentage >= 40.0:
        sub.rank_level = "Level D"
        sub.rank_title = "Level D - Yếu / Chưa đạt chuẩn vị trí"
        sub.nine_box_category = "Low Skill - Medium Will (Inconsistent / Training Needed)"
        sub.position_fit_status = "Chưa đáp ứng tiêu chuẩn công việc, đào tạo lại"
    else:
        sub.rank_level = "Level F"
        sub.rank_title = "Level F - Kém / Không đạt yêu cầu"
        sub.nine_box_category = "Low Skill - Low Will (Underperformer / Risk)"
        sub.position_fit_status = "Không phù hợp, xem xét điều chuyển"
        
    sub.total_score = round(total_score, 2)
    sub.percentage = round(percentage, 1)
    
    db.commit()
    db.refresh(sub)
    return get_submission_result(db, sub.id)

def list_assessment_submissions(db: Session, assessment_id: Optional[int] = None, search: Optional[str] = None, rank_level: Optional[str] = None):
    """Lấy danh sách các bài làm của học viên/nhân sự để hiển thị trên Admin Dashboard"""
    query = db.query(HRAssessmentSubmission)
    if assessment_id:
        query = query.filter(HRAssessmentSubmission.assessment_id == assessment_id)
    if search:
        query = query.filter(
            HRAssessmentSubmission.candidate_name.ilike(f"%{search}%") | 
            HRAssessmentSubmission.employee_code.ilike(f"%{search}%") |
            HRAssessmentSubmission.department_name.ilike(f"%{search}%") |
            HRAssessmentSubmission.position_name.ilike(f"%{search}%")
        )
    if rank_level and rank_level != "all":
        query = query.filter(HRAssessmentSubmission.rank_level == rank_level)
        
    submissions = query.order_by(desc(HRAssessmentSubmission.submitted_at)).all()
    
    result = []
    for s in submissions:
        result.append({
            "id": s.id,
            "assessment_id": s.assessment_id,
            "assessment_title": s.assessment.title if s.assessment else "",
            "candidate_name": s.candidate_name,
            "position_name": s.position_name,
            "department_name": s.department_name,
            "employee_code": s.employee_code,
            "total_score": s.total_score,
            "max_score": s.max_score,
            "percentage": s.percentage,
            "rank_level": s.rank_level,
            "rank_title": s.rank_title,
            "nine_box_category": s.nine_box_category,
            "position_fit_status": s.position_fit_status,
            "time_spent_seconds": s.time_spent_seconds,
            "submitted_at": s.submitted_at.strftime("%Y-%m-%d %H:%M") if s.submitted_at else ""
        })
    return result

def export_submissions_excel(db: Session, assessment_id: Optional[int] = None) -> bytes:
    """Xuất file Excel danh sách toàn bộ kết quả bài làm của nhân sự"""
    subs = list_assessment_submissions(db, assessment_id=assessment_id)
    
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "KetQua_DanhGia"
    ws.views.sheetView[0].showGridLines = True
    
    brand_fill = PatternFill(start_color="D97706", end_color="D97706", fill_type="solid")
    header_fill = PatternFill(start_color="FDE68A", end_color="FDE68A", fill_type="solid")
    font_header = Font(name="Arial", size=10, bold=True, color="1C1917")
    font_regular = Font(name="Arial", size=10, color="1C1917")
    thin_border = Border(
        left=Side(style="thin", color="D6D3D1"),
        right=Side(style="thin", color="D6D3D1"),
        top=Side(style="thin", color="D6D3D1"),
        bottom=Side(style="thin", color="D6D3D1")
    )
    
    ws.merge_cells("A1:K1")
    ws["A1"] = "BÁO CÁO KẾT QUẢ ĐÁNH GIÁ NĂNG LỰC NHÂN SỰ"
    ws["A1"].font = Font(name="Arial", size=14, bold=True, color="FFFFFF")
    ws["A1"].fill = brand_fill
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 32
    
    headers = [
        ("STT", 6),
        ("Đợt kiểm tra / Bài thi", 30),
        ("Mã NV", 12),
        ("Họ và tên", 22),
        ("Vị trí chức danh", 20),
        ("Bộ phận / Chuyền", 20),
        ("Điểm số", 14),
        ("Tỷ lệ %", 10),
        ("Xếp loại Level", 16),
        ("Phân vị 9-Box Grid", 26),
        ("Thời gian nộp bài", 18)
    ]
    
    for col_idx, (h_text, width) in enumerate(headers, start=1):
        c = ws.cell(row=3, column=col_idx, value=h_text)
        c.font = font_header
        c.fill = header_fill
        c.alignment = Alignment(horizontal="center", vertical="center")
        c.border = thin_border
        col_letter = get_column_letter(col_idx)
        ws.column_dimensions[col_letter].width = width
        
    ws.row_dimensions[3].height = 26
    
    for row_idx, s in enumerate(subs, start=4):
        score_str = f"{s['total_score']} / {s['max_score']}"
        row_data = [
            row_idx - 3,
            s["assessment_title"],
            s["employee_code"] or "---",
            s["candidate_name"],
            s["position_name"],
            s["department_name"],
            score_str,
            f"{s['percentage']}%",
            s["rank_level"],
            s["nine_box_category"] or "---",
            s["submitted_at"]
        ]
        
        for col_idx, val in enumerate(row_data, start=1):
            c = ws.cell(row=row_idx, column=col_idx, value=val)
            c.font = font_regular
            c.border = thin_border
            if col_idx in (1, 3, 7, 8, 9, 11):
                c.alignment = Alignment(horizontal="center", vertical="center")
            else:
                c.alignment = Alignment(vertical="center")
        ws.row_dimensions[row_idx].height = 22
        
    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()
